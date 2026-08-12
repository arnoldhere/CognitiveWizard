import { useState, useEffect, useRef } from "react";
import { Link, NavLink, useLocation } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import { motion, AnimatePresence } from "framer-motion";
import {
  Menu,
  X,
  User,
  LogOut,
  ChevronDown,
  BookOpen,
  Home,
  GraduationCap,
  Sparkles,
  Brain,
  Zap,
  MessageCircle,
  ArrowRight,
} from "lucide-react";

const baseNavItems = [
  {
    to: "/",
    label: "Home",
    end: true,
    icon: Home,
  },
  {
    to: "/courses",
    label: "Courses",
    icon: GraduationCap,
  },
  {
    to: "/wizard",
    label: "AI Wizard",
    icon: Sparkles,
  },
  {
    to: "/quiz",
    label: "Quiz",
    icon: Brain,
  },
  {
    to: "/quick-study",
    label: "Quick Study",
    icon: Zap,
  },
  {
    to: "/chatbot",
    label: "AI Chat",
    icon: MessageCircle,
  },
];

export default function Navbar() {
  const [open, setOpen] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  const profileRef = useRef(null);

  const { user, isAuthenticated, logout, isTutor } = useAuth();
  const location = useLocation();

  const userLabel =
    user?.full_name ||
    user?.email?.split("@")[0] ||
    "Profile";

  const userInitial = userLabel.charAt(0).toUpperCase();

  /*
   * Close menus when route changes.
   */
  useEffect(() => {
    setOpen(false);
    setShowProfile(false);
  }, [location.pathname]);

  /*
   * Navbar scroll state.
   */
  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 16);
    };

    handleScroll();

    window.addEventListener("scroll", handleScroll, {
      passive: true,
    });

    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);

  /*
   * Prevent body scrolling while mobile menu is open.
   */
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }

    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  /*
   * Close profile dropdown when clicking outside.
   */
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        profileRef.current &&
        !profileRef.current.contains(event.target)
      ) {
        setShowProfile(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      document.removeEventListener(
        "mousedown",
        handleClickOutside
      );
    };
  }, []);

  /*
   * Close menus with Escape.
   */
  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        setOpen(false);
        setShowProfile(false);
      }
    };

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  /*
   * Tutors don't see Courses.
   */
  const navItems = baseNavItems.filter((item) => {
    if (item.label === "Courses" && isTutor) {
      return false;
    }

    return true;
  });

  const closeMenu = () => {
    setOpen(false);
    setShowProfile(false);
  };

  const handleLogout = () => {
    closeMenu();
    logout();
  };

  return (
    <>
      {/* Mobile backdrop */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-slate-950/40 backdrop-blur-sm lg:hidden"
            onClick={() => setOpen(false)}
          />
        )}
      </AnimatePresence>

      <header
        className={`
          fixed top-0 left-0 right-0 z-50
          transition-all duration-500 ease-out
          ${scrolled
            ? "py-3"
            : "py-5"
          }
        `}
      >
        <div className="container mx-auto px-4 md:px-6">
          <div
            className={`
              relative flex items-center justify-between
              h-[68px] px-3 sm:px-4
              rounded-2xl
              border
              transition-all duration-500
              ${scrolled
                ? `
                    bg-white/85
                    dark:bg-[#263746]/90
                    backdrop-blur-xl
                    border-slate-200/80
                    dark:border-slate-700/70
                    shadow-[0_10px_40px_rgba(56,73,89,0.10)]
                  `
                : `
                    bg-white/70
                    dark:bg-[#263746]/70
                    backdrop-blur-lg
                    border-white/60
                    dark:border-slate-700/40
                    shadow-[0_8px_30px_rgba(56,73,89,0.06)]
                  `
              }
            `}
          >
            {/* Subtle top highlight */}
            <div className="pointer-events-none absolute inset-x-5 top-0 h-px bg-gradient-to-r from-transparent via-[#88BDF2]/50 to-transparent" />

            {/* =========================
                LOGO
            ========================== */}
            <Link
              to="/"
              onClick={closeMenu}
              className="
                relative z-10
                flex items-center gap-2.5
                min-w-fit
                group
                focus:outline-none
              "
              aria-label="CognitiveWizard home"
            >
              <div
                className="
                  relative
                  w-10 h-10
                  rounded-xl
                  flex items-center justify-center
                  overflow-hidden
                  bg-gradient-to-br from-[#6A89A7] via-[#7EA8CB] to-[#88BDF2]
                  text-slate-900
                  shadow-[0_6px_20px_rgba(106,137,167,0.30)]
                  transition-all duration-300
                  group-hover:scale-105
                  group-hover:shadow-[0_8px_25px_rgba(136,189,242,0.40)]
                "
              >
                <div className="absolute inset-0 bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity" />

                <BookOpen
                  size={20}
                  strokeWidth={2.5}
                  className="relative z-10"
                />
              </div>

              <div className="hidden xs:block sm:block">
                <span
                  className="
                    text-[18px]
                    sm:text-[20px]
                    font-black
                    tracking-[-0.03em]
                    text-[#384959]
                    dark:text-white
                  "
                >
                  Cognitive
                  <span className="text-[#6A89A7] dark:text-[#88BDF2]">
                    Wizard
                  </span>
                </span>

                <div className="hidden md:flex items-center gap-1.5 -mt-0.5">
                  <span className="w-1 h-1 rounded-full bg-[#88BDF2]" />
                  <span className="text-[9px] font-bold uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500">
                    Learn smarter
                  </span>
                </div>
              </div>
            </Link>

            {/* =========================
                DESKTOP NAVIGATION
            ========================== */}
            <nav
              className="
                hidden lg:flex
                absolute left-1/2 -translate-x-1/2
                items-center
                gap-0.5
                p-1
                rounded-xl
                bg-slate-100/70
                dark:bg-slate-900/30
                border border-slate-200/50
                dark:border-slate-700/40
              "
              aria-label="Main navigation"
            >
              {navItems.map((item) => {
                const Icon = item.icon;

                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    end={item.end}
                    className={({ isActive }) => `
                      relative
                      flex items-center gap-1.5
                      px-3 py-2
                      rounded-lg
                      text-[12px]
                      xl:text-[13px]
                      font-bold
                      whitespace-nowrap
                      transition-all duration-200
                      ${isActive
                        ? `
                            text-[#384959]
                            dark:text-white
                            bg-white
                            dark:bg-[#384959]
                            shadow-sm
                          `
                        : `
                            text-slate-500
                            dark:text-slate-400
                            hover:text-[#384959]
                            dark:hover:text-white
                            hover:bg-white/70
                            dark:hover:bg-slate-800/60
                          `
                      }
                    `}
                  >
                    {({ isActive }) => (
                      <>
                        <Icon
                          size={14}
                          strokeWidth={isActive ? 2.5 : 2}
                          className={
                            isActive
                              ? "text-[#6A89A7] dark:text-[#88BDF2]"
                              : ""
                          }
                        />

                        <span>{item.label}</span>

                        {isActive && (
                          <motion.span
                            layoutId="navbar-active"
                            className="
                              absolute
                              -bottom-[1px]
                              left-1/2
                              -translate-x-1/2
                              w-5
                              h-0.5
                              rounded-full
                              bg-[#6A89A7]
                              dark:bg-[#88BDF2]
                            "
                            transition={{
                              type: "spring",
                              stiffness: 400,
                              damping: 30,
                            }}
                          />
                        )}
                      </>
                    )}
                  </NavLink>
                );
              })}
            </nav>

            {/* =========================
                DESKTOP ACTIONS
            ========================== */}
            <div className="hidden lg:flex items-center gap-2.5">
              {isAuthenticated ? (
                <div
                  ref={profileRef}
                  className="relative"
                >
                  <button
                    type="button"
                    onClick={() =>
                      setShowProfile((prev) => !prev)
                    }
                    aria-expanded={showProfile}
                    aria-haspopup="menu"
                    className="
                      flex items-center gap-2.5
                      pl-1.5 pr-3
                      py-1.5
                      rounded-full
                      bg-white/80
                      dark:bg-slate-800/80
                      border border-slate-200
                      dark:border-slate-700
                      shadow-sm
                      hover:shadow-md
                      hover:border-[#88BDF2]/50
                      transition-all duration-200
                      focus:outline-none
                      focus:ring-2
                      focus:ring-[#88BDF2]/40
                    "
                  >
                    <div
                      className="
                        relative
                        w-8 h-8
                        rounded-full
                        flex items-center justify-center
                        bg-gradient-to-br
                        from-[#6A89A7]
                        to-[#88BDF2]
                        text-slate-900
                        text-xs
                        font-black
                        shadow-inner
                      "
                    >
                      {userInitial}

                      <span
                        className="
                          absolute
                          bottom-0
                          right-0
                          w-2.5
                          h-2.5
                          rounded-full
                          bg-emerald-400
                          border-2
                          border-white
                          dark:border-slate-800
                        "
                      />
                    </div>

                    <span className="max-w-[110px] truncate text-sm font-bold text-[#384959] dark:text-white">
                      {userLabel}
                    </span>

                    <ChevronDown
                      size={14}
                      className={`
                        text-slate-400
                        transition-transform duration-200
                        ${showProfile
                          ? "rotate-180"
                          : ""
                        }
                      `}
                    />
                  </button>

                  <AnimatePresence>
                    {showProfile && (
                      <motion.div
                        initial={{
                          opacity: 0,
                          y: 8,
                          scale: 0.97,
                        }}
                        animate={{
                          opacity: 1,
                          y: 0,
                          scale: 1,
                        }}
                        exit={{
                          opacity: 0,
                          y: 8,
                          scale: 0.97,
                        }}
                        transition={{
                          duration: 0.18,
                          ease: "easeOut",
                        }}
                        className="
                          absolute
                          right-0
                          top-full
                          mt-3
                          w-64
                          overflow-hidden
                          rounded-2xl
                          border
                          border-slate-200
                          dark:border-slate-700
                          bg-white
                          dark:bg-[#2d4050]
                          shadow-[0_20px_50px_rgba(15,23,42,0.15)]
                          dark:shadow-[0_20px_50px_rgba(0,0,0,0.30)]
                        "
                        role="menu"
                      >
                        {/* Profile header */}
                        <div className="relative overflow-hidden p-4">
                          <div className="absolute inset-0 bg-gradient-to-br from-[#BDDDFC]/30 via-transparent to-[#88BDF2]/10" />

                          <div className="relative flex items-center gap-3">
                            <div
                              className="
                                w-11 h-11
                                shrink-0
                                rounded-xl
                                flex items-center justify-center
                                bg-gradient-to-br from-[#6A89A7] to-[#88BDF2]
                                text-slate-900
                                font-black
                              "
                            >
                              {userInitial}
                            </div>

                            <div className="min-w-0">
                              <p className="text-sm font-extrabold text-slate-900 dark:text-white truncate">
                                {user?.full_name || "User"}
                              </p>

                              <p className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">
                                {user?.email}
                              </p>
                            </div>
                          </div>

                          {user?.role && (
                            <div className="relative mt-3">
                              <span
                                className="
                                  inline-flex
                                  items-center
                                  px-2.5 py-1
                                  rounded-full
                                  text-[9px]
                                  font-black
                                  uppercase
                                  tracking-[0.12em]
                                  bg-[#BDDDFC]
                                  text-[#384959]
                                "
                              >
                                {user.role}
                              </span>
                            </div>
                          )}
                        </div>

                        <div className="h-px bg-slate-100 dark:bg-slate-700" />

                        {/* Menu items */}
                        <div className="p-2">
                          <Link
                            to="/profile"
                            onClick={closeMenu}
                            role="menuitem"
                            className="
                              group
                              flex items-center gap-3
                              px-3 py-2.5
                              rounded-xl
                              text-sm font-bold
                              text-slate-600
                              dark:text-slate-200
                              hover:text-[#384959]
                              dark:hover:text-white
                              hover:bg-slate-50
                              dark:hover:bg-slate-800/70
                              transition-colors
                            "
                          >
                            <span
                              className="
                                w-8 h-8
                                rounded-lg
                                flex items-center justify-center
                                bg-slate-100
                                dark:bg-slate-800
                                text-slate-500
                                dark:text-slate-300
                                group-hover:bg-[#BDDDFC]
                                group-hover:text-[#384959]
                                transition-colors
                              "
                            >
                              <User size={15} />
                            </span>

                            <span>My Profile</span>
                          </Link>

                          <button
                            type="button"
                            onClick={handleLogout}
                            role="menuitem"
                            className="
                              group
                              w-full
                              flex items-center gap-3
                              px-3 py-2.5
                              rounded-xl
                              text-sm font-bold
                              text-rose-600
                              hover:bg-rose-50
                              dark:hover:bg-rose-900/20
                              transition-colors
                            "
                          >
                            <span
                              className="
                                w-8 h-8
                                rounded-lg
                                flex items-center justify-center
                                bg-rose-50
                                dark:bg-rose-900/20
                                group-hover:bg-rose-100
                                dark:group-hover:bg-rose-900/30
                                transition-colors
                              "
                            >
                              <LogOut size={15} />
                            </span>

                            <span>Sign Out</span>
                          </button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              ) : (
                <>
                  <Link
                    to="/login"
                    className="
    px-3.5 py-2.5
    rounded-xl

    text-sm
    font-bold
    text-[#384959]
    dark:text-slate-100

    hover:text-[#5B7FA3]
    dark:hover:text-[#88BDF2]

    hover:bg-[#BDDDFC]/20
    dark:hover:bg-[#88BDF2]/10

    transition-all
    duration-200
  "
                  >
                    Log in
                  </Link>

                  <Link
                    to="/signup"
                    className="
    group
    flex items-center gap-2

    px-4 py-2.5
    rounded-xl

    bg-[#6A89A7]
    hover:bg-[#52718D]

    dark:bg-[#88BDF2]
    dark:hover:bg-[#6A89A7]

    text-white
    dark:text-[#263746]

    hover:text-white
    dark:hover:text-white

    text-sm
    font-extrabold

    border
    border-[#6A89A7]/20
    dark:border-[#88BDF2]/20

    shadow-[0_5px_18px_rgba(56,73,89,0.18)]
    hover:shadow-[0_8px_24px_rgba(56,73,89,0.25)]
    dark:shadow-[0_5px_20px_rgba(136,189,242,0.20)]
    dark:hover:shadow-[0_8px_25px_rgba(106,137,167,0.30)]

    transition-all
    duration-200

    hover:-translate-y-0.5
  "
                  >
                    <span>Get Started</span>

                    <ArrowRight
                      size={14}
                      className="
      transition-transform
      duration-200
      group-hover:translate-x-1
    "
                    />
                  </Link>
                </>
              )}
            </div>

            {/* =========================
                MOBILE MENU BUTTON
            ========================== */}
            <button
              type="button"
              aria-label={
                open
                  ? "Close navigation menu"
                  : "Open navigation menu"
              }
              aria-expanded={open}
              onClick={() => setOpen((prev) => !prev)}
              className="
                relative
                lg:hidden
                w-10 h-10
                rounded-xl
                flex items-center justify-center
                text-[#384959]
                dark:text-white
                bg-slate-100/70
                dark:bg-slate-800/70
                border border-slate-200/60
                dark:border-slate-700/60
                hover:bg-slate-200/70
                dark:hover:bg-slate-700/70
                transition-all
                focus:outline-none
                focus:ring-2
                focus:ring-[#88BDF2]/40
              "
            >
              <AnimatePresence mode="wait" initial={false}>
                {open ? (
                  <motion.span
                    key="close"
                    initial={{
                      opacity: 0,
                      rotate: -90,
                      scale: 0.7,
                    }}
                    animate={{
                      opacity: 1,
                      rotate: 0,
                      scale: 1,
                    }}
                    exit={{
                      opacity: 0,
                      rotate: 90,
                      scale: 0.7,
                    }}
                  >
                    <X size={21} />
                  </motion.span>
                ) : (
                  <motion.span
                    key="menu"
                    initial={{
                      opacity: 0,
                      rotate: 90,
                      scale: 0.7,
                    }}
                    animate={{
                      opacity: 1,
                      rotate: 0,
                      scale: 1,
                    }}
                    exit={{
                      opacity: 0,
                      rotate: -90,
                      scale: 0.7,
                    }}
                  >
                    <Menu size={21} />
                  </motion.span>
                )}
              </AnimatePresence>
            </button>
          </div>

          {/* =========================
              MOBILE NAVIGATION
          ========================== */}
          <AnimatePresence>
            {open && (
              <motion.div
                initial={{
                  opacity: 0,
                  y: -10,
                  scale: 0.98,
                }}
                animate={{
                  opacity: 1,
                  y: 0,
                  scale: 1,
                }}
                exit={{
                  opacity: 0,
                  y: -10,
                  scale: 0.98,
                }}
                transition={{
                  duration: 0.2,
                  ease: "easeOut",
                }}
                className="
                  relative
                  lg:hidden
                  mt-3
                  overflow-hidden
                  rounded-2xl
                  border
                  border-slate-200/80
                  dark:border-slate-700/80
                  bg-white/95
                  dark:bg-[#263746]/95
                  backdrop-blur-xl
                  shadow-[0_20px_50px_rgba(15,23,42,0.15)]
                  dark:shadow-[0_20px_50px_rgba(0,0,0,0.30)]
                "
              >
                {/* Mobile top gradient */}
                <div className="absolute inset-x-0 top-0 h-20 bg-gradient-to-b from-[#BDDDFC]/20 to-transparent pointer-events-none" />

                <div className="relative p-3">
                  {/* Mobile nav */}
                  <nav
                    className="flex flex-col gap-1"
                    aria-label="Mobile navigation"
                  >
                    {navItems.map((item) => {
                      const Icon = item.icon;

                      return (
                        <NavLink
                          key={item.to}
                          to={item.to}
                          end={item.end}
                          onClick={closeMenu}
                          className={({ isActive }) => `
                            group
                            flex items-center gap-3
                            px-3.5 py-3
                            rounded-xl
                            text-sm
                            font-bold
                            transition-all duration-200
                            ${isActive
                              ? `
                                  bg-[#BDDDFC]/50
                                  dark:bg-[#6A89A7]/25
                                  text-[#384959]
                                  dark:text-white
                                `
                              : `
                                  text-slate-600
                                  dark:text-slate-300
                                  hover:bg-slate-50
                                  dark:hover:bg-slate-800/70
                                  hover:text-[#384959]
                                  dark:hover:text-white
                                `
                            }
                          `}
                        >
                          {({ isActive }) => (
                            <>
                              <span
                                className={`
                                  flex items-center justify-center
                                  w-9 h-9
                                  rounded-lg
                                  transition-colors
                                  ${isActive
                                    ? `
                                        bg-white/80
                                        dark:bg-slate-800
                                        text-[#6A89A7]
                                        dark:text-[#88BDF2]
                                      `
                                    : `
                                        bg-slate-100
                                        dark:bg-slate-800/70
                                        text-slate-400
                                        dark:text-slate-500
                                        group-hover:text-[#6A89A7]
                                      `
                                  }
                                `}
                              >
                                <Icon size={17} />
                              </span>

                              <span className="flex-1">
                                {item.label}
                              </span>

                              {isActive && (
                                <span className="w-1.5 h-1.5 rounded-full bg-[#6A89A7] dark:bg-[#88BDF2]" />
                              )}
                            </>
                          )}
                        </NavLink>
                      );
                    })}
                  </nav>

                  {/* Divider */}
                  <div className="h-px bg-slate-100 dark:bg-slate-700/70 my-3" />

                  {/* Mobile account section */}
                  {isAuthenticated ? (
                    <div className="flex flex-col gap-1">
                      <div
                        className="
                          flex items-center gap-3
                          px-3 py-3
                          mb-1
                          rounded-xl
                          bg-slate-50
                          dark:bg-slate-800/60
                        "
                      >
                        <div
                          className="
                            w-10 h-10
                            shrink-0
                            rounded-xl
                            flex items-center justify-center
                            bg-gradient-to-br
                            from-[#6A89A7]
                            to-[#88BDF2]
                            text-slate-900
                            font-black
                          "
                        >
                          {userInitial}
                        </div>

                        <div className="min-w-0">
                          <p className="text-sm font-extrabold text-slate-900 dark:text-white truncate">
                            {user?.full_name || "User"}
                          </p>

                          <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                            {user?.email}
                          </p>
                        </div>
                      </div>

                      <Link
                        to="/profile"
                        onClick={closeMenu}
                        className="
                          flex items-center gap-3
                          px-3.5 py-3
                          rounded-xl
                          text-sm font-bold
                          text-slate-600
                          dark:text-slate-300
                          hover:bg-slate-50
                          dark:hover:bg-slate-800/70
                          transition-colors
                        "
                      >
                        <User size={18} />
                        My Profile
                      </Link>

                      <button
                        type="button"
                        onClick={handleLogout}
                        className="
                          flex items-center gap-3
                          px-3.5 py-3
                          rounded-xl
                          text-sm font-bold
                          text-rose-600
                          hover:bg-rose-50
                          dark:hover:bg-rose-900/20
                          transition-colors
                        "
                      >
                        <LogOut size={18} />
                        Sign Out
                      </button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-2">
                      <Link
                        to="/login"
                        onClick={closeMenu}
                        className="
                          flex items-center justify-center
                          py-3
                          rounded-xl
                          border
                          border-slate-200
                          dark:border-slate-700
                          text-[#384959]
                          dark:text-white
                          text-sm
                          font-bold
                          hover:bg-slate-50
                          dark:hover:bg-slate-800
                          transition-colors
                        "
                      >
                        Log in
                      </Link>

                      <Link
                        to="/signup"
                        onClick={closeMenu}
                        className="
                          group
                          flex items-center justify-center gap-1.5
                          py-3
                          rounded-xl
                          bg-[#6A89A7]
                          hover:bg-[#384959]
                          dark:bg-[#88BDF2]
                          dark:hover:bg-[#6A89A7]
                          text-slate-900
                          hover:text-white
                          text-sm
                          font-extrabold
                          transition-all
                        "
                      >
                        Get Started
                        <ArrowRight
                          size={14}
                          className="group-hover:translate-x-0.5 transition-transform"
                        />
                      </Link>
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </header>
    </>
  );
}