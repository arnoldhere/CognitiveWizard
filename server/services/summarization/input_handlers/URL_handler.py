import requests
from bs4 import BeautifulSoup
from urllib.parse import urlparse
from services.summarization.preprocess.text_cleaner import TextCleaner
import ipaddress
import socket


def _is_valid_url(url: str) -> bool:
    """Validate URL format and scheme."""
    try:
        parsed = urlparse(url)
        return parsed.scheme in ["http", "https"]
    except:
        return False


# security measure to prevent CSRF-SSRF attacks
def _is_public_destination(url: str) -> bool:
    """Allow only URLs that resolve to globally routable IP addresses."""
    try:
        parsed = urlparse(url)
        hostname = parsed.hostname
        if not hostname:
            return False
        # if hostname.lower() == "localhost":
        #     return False

        # If hostname is already an IP literal, validate directly.
        try:
            ip = ipaddress.ip_address(hostname)
            return ip.is_global
        except ValueError:
            pass

        # Resolve DNS and ensure all resolved addresses are global.
        addrinfo = socket.getaddrinfo(
            hostname, parsed.port or 80, proto=socket.IPPROTO_TCP
        )
        resolved_ips = {info[4][0] for info in addrinfo}
        if not resolved_ips:
            return False
        for resolved_ip in resolved_ips:
            ip = ipaddress.ip_address(resolved_ip)
            if not ip.is_global:
                return False

        return True
    except:
        return False


def extract_text(url: str) -> str:
    """
    Extract textual content from web pages with enhanced validation.
    """
    try:
        # Validate URL
        if not _is_valid_url(url):
            raise ValueError(f"Invalid URL format: {url}")
        if not _is_public_destination(url):
            raise ValueError("URL points to a non-public or restricted destination")

        # Enhanced headers for better access
        HEADERS = {
            "User-Agent": (
                "Mozilla/5.0 (X11; Linux x86_64) "
                "AppleWebKit/537.36 (KHTML, like Gecko) "
                "Chrome/120.0.0.0 Safari/537.36"
            ),
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
            "Accept-Language": "en-US,en;q=0.5",
            "Accept-Encoding": "gzip, deflate",
            "Connection": "keep-alive",
        }

        # Make request with timeout and retry logic
        response = requests.get(url, timeout=30, headers=HEADERS)
        response.raise_for_status()

        # Check content type
        content_type = response.headers.get("content-type", "").lower()
        if not content_type.startswith("text/html"):
            raise ValueError(f"URL does not contain HTML content: {content_type}")

        soup = BeautifulSoup(response.text, "html.parser")

        # Remove unwanted elements
        for tag in soup(
            ["script", "style", "nav", "header", "footer", "aside", "noscript"]
        ):
            tag.decompose()

        # Remove comments
        for comment in soup.find_all(
            string=lambda text: isinstance(text, str) and text.startswith("<!--")
        ):
            comment.extract()

        # Extract text from different sources
        text_parts = []

        # Get title
        title = soup.find("title")
        if title:
            text_parts.append(f"Title: {title.get_text().strip()}")

        # Get meta description
        meta_desc = soup.find("meta", attrs={"name": "description"})
        if meta_desc and meta_desc.get("content"):
            text_parts.append(f"Description: {meta_desc['content'].strip()}")

        # Extract main content areas
        content_selectors = [
            "main",
            "article",
            ".content",
            "#content",
            ".post",
            ".entry",
        ]
        main_content = None

        for selector in content_selectors:
            if selector.startswith("."):
                main_content = soup.select_one(selector)
            else:
                main_content = soup.find(selector)
            if main_content:
                break

        if main_content:
            # Extract paragraphs from main content
            paragraphs = main_content.find_all("p")
            if paragraphs:
                text_parts.extend(
                    [p.get_text().strip() for p in paragraphs if p.get_text().strip()]
                )
            else:
                # Fallback to all text in main content
                text_parts.append(main_content.get_text(separator=" ").strip())
        else:
            # Fallback: extract all paragraphs
            paragraphs = soup.find_all("p")
            text_parts.extend(
                [p.get_text().strip() for p in paragraphs if p.get_text().strip()]
            )

        # Join all text parts
        full_text = "\n\n".join(text_parts)

        if not full_text.strip():
            raise ValueError("No meaningful text content found on the webpage")

        # Validate extracted content
        is_valid, validation_msg = TextCleaner.validate_content(full_text)
        if not is_valid:
            raise ValueError(f"Extracted content validation failed: {validation_msg}")

        return full_text.strip()

    except requests.exceptions.Timeout:
        raise ValueError(f"Request timeout for URL: {url}")
    except requests.exceptions.ConnectionError:
        raise ValueError(f"Connection error for URL: {url}")
    except requests.exceptions.HTTPError as e:
        raise ValueError(f"HTTP error {e.response.status_code} for URL: {url}")
    except requests.exceptions.RequestException as e:
        raise ValueError(f"Request failed for URL {url}: {str(e)}")
    except Exception as e:
        raise ValueError(f"URL extraction failed: {str(e)}")
