import { forwardRef } from "react";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { motion } from "framer-motion";
import { Loader2 } from "lucide-react";

/**
 * Merge Tailwind classes safely.
 */
export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

/**
 * Shared Button component
 *
 * Props:
 * - variant: primary | secondary | outline | ghost | danger | subtle
 * - size: xs | sm | md | lg | xl
 * - leftIcon: ReactNode
 * - rightIcon: ReactNode
 * - isLoading: boolean
 * - fullWidth: boolean
 * - loadingText: string
 */
const Button = forwardRef(
  (
    {
      className,
      variant = "primary",
      size = "md",
      children,
      isLoading = false,
      loadingText,
      leftIcon,
      rightIcon,
      fullWidth = false,
      type = "button",
      ...props
    },
    ref
  ) => {
    const variants = {
      primary: `
        bg-[#6A89A7]
        text-slate-950
        border border-transparent
        shadow-[0_4px_14px_rgba(106,137,167,0.22)]
        hover:bg-[#5C7E9D]
        hover:shadow-[0_6px_20px_rgba(106,137,167,0.30)]
        active:bg-[#52718D]
      `,

      secondary: `
        bg-[#BDDDFC]
        text-[#384959]
        border border-transparent
        shadow-sm
        hover:bg-[#A9D2F4]
        hover:shadow-md
        active:bg-[#9CC9EE]
      `,

      outline: `
        bg-transparent
        text-[#6A89A7]
        border border-[#6A89A7]/70
        hover:bg-[#6A89A7]/10
        hover:border-[#6A89A7]
        hover:text-[#384959]
        dark:text-[#88BDF2]
        dark:border-[#88BDF2]/60
        dark:hover:bg-[#88BDF2]/10
        dark:hover:text-white
      `,

      ghost: `
        bg-transparent
        text-[#384959]
        border border-transparent
        hover:bg-[#BDDDFC]/30
        hover:text-[#6A89A7]
        dark:text-slate-200
        dark:hover:bg-slate-800
        dark:hover:text-[#88BDF2]
      `,

      subtle: `
        bg-slate-100
        text-slate-700
        border border-slate-200
        shadow-sm
        hover:bg-slate-200
        hover:border-slate-300
        dark:bg-slate-800
        dark:text-slate-200
        dark:border-slate-700
        dark:hover:bg-slate-700
      `,

      danger: `
        bg-red-500
        text-white
        border border-transparent
        shadow-[0_4px_14px_rgba(239,68,68,0.20)]
        hover:bg-red-600
        hover:shadow-[0_6px_20px_rgba(239,68,68,0.28)]
        active:bg-red-700
      `,
    };

    const sizes = {
      xs: `
        min-h-8
        px-2.5
        text-xs
        rounded-lg
        gap-1.5
      `,

      sm: `
        min-h-9
        px-3
        text-sm
        rounded-lg
        gap-2
      `,

      md: `
        min-h-10
        px-4
        text-sm
        sm:text-base
        rounded-xl
        gap-2
      `,

      lg: `
        min-h-12
        px-5
        text-base
        sm:text-lg
        rounded-xl
        gap-2.5
      `,

      xl: `
        min-h-14
        px-7
        text-base
        sm:text-lg
        rounded-2xl
        gap-3
      `,
    };

    const isDisabled = isLoading || props.disabled;

    return (
      <motion.button
        ref={ref}
        type={type}
        disabled={isDisabled}
        whileHover={!isDisabled ? { y: -1, scale: 1.01 } : undefined}
        whileTap={!isDisabled ? { scale: 0.98 } : undefined}
        transition={{
          type: "spring",
          stiffness: 400,
          damping: 25,
        }}
        aria-busy={isLoading}
        aria-disabled={isDisabled}
        className={cn(
          `
            relative
            inline-flex
            items-center
            justify-center
            overflow-hidden

            font-bold
            tracking-[-0.01em]

            whitespace-nowrap
            select-none

            transition-all
            duration-200
            ease-out

            focus:outline-none
            focus-visible:ring-2
            focus-visible:ring-[#88BDF2]
            focus-visible:ring-offset-2
            focus-visible:ring-offset-white
            dark:focus-visible:ring-offset-[#263746]

            disabled:cursor-not-allowed
            disabled:opacity-50
            disabled:shadow-none
            disabled:transform-none

            [&_svg]:shrink-0
          `,
          variants[variant] || variants.primary,
          sizes[size] || sizes.md,
          fullWidth && "w-full",
          className
        )}
        {...props}
      >
        {/* Subtle shine effect */}
        {!isDisabled && variant === "primary" && (
          <span
            className="
              pointer-events-none
              absolute
              inset-0
              -translate-x-full
              bg-gradient-to-r
              from-transparent
              via-white/15
              to-transparent
              transition-transform
              duration-700
              group-hover:translate-x-full
            "
          />
        )}

        {/* Loading */}
        {isLoading ? (
          <>
            <Loader2
              className="h-4 w-4 animate-spin"
              aria-hidden="true"
            />

            <span>
              {loadingText || children}
            </span>
          </>
        ) : (
          <>
            {leftIcon && (
              <span
                className="inline-flex items-center justify-center"
                aria-hidden="true"
              >
                {leftIcon}
              </span>
            )}

            <span>{children}</span>

            {rightIcon && (
              <span
                className="
                  inline-flex
                  items-center
                  justify-center
                  transition-transform
                  duration-200
                  group-hover:translate-x-0.5
                "
                aria-hidden="true"
              >
                {rightIcon}
              </span>
            )}
          </>
        )}
      </motion.button>
    );
  }
);

Button.displayName = "Button";

export default Button;