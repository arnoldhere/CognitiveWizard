import { Mail, MapPin, ArrowUpRight } from "lucide-react";
import { motion } from "framer-motion";

const contactItems = [
  {
    icon: Mail,
    label: "Email",
    value: "support@cognitivewizard.ai",
    sub: "We typically reply within 24 hours.",
    href: "mailto:support@cognitivewizard.ai",
  },
  {
    icon: MapPin,
    label: "Office",
    value: "123 AI Lane, Learning City",
    sub: "Remote-first team working worldwide.",
  },
];

export default function Contact() {
  return (
    <section className="relative min-h-screen overflow-hidden bg-light px-4 py-20 sm:px-6 sm:py-24 lg:px-8">
      {/* Background decoration */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -right-32 -top-32 h-96 w-96 rounded-full bg-accent/20 blur-3xl" />
        <div className="absolute -bottom-32 -left-32 h-96 w-96 rounded-full bg-primary/10 blur-3xl" />

        <div className="absolute inset-0 opacity-[0.035] [background-image:linear-gradient(#0f172a_1px,transparent_1px),linear-gradient(90deg,#0f172a_1px,transparent_1px)] [background-size:48px_48px]" />
      </div>

      <div className="relative mx-auto flex min-h-[calc(100vh-10rem)] w-full max-w-5xl flex-col justify-center">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="mx-auto mb-14 max-w-3xl text-center"
        >
          <div className="mb-5 inline-flex items-center rounded-full border border-primary/10 bg-white px-4 py-2 shadow-sm">
            <span className="mr-2 h-2 w-2 rounded-full bg-primary" />
            <span className="text-sm font-semibold tracking-wide text-primary">
              Get in touch
            </span>
          </div>

          <h1 className="mb-6 text-4xl font-extrabold tracking-tight text-dark sm:text-5xl md:text-6xl">
            Let&apos;s start a{" "}
            <span className="text-primary">conversation.</span>
          </h1>

          <p className="mx-auto max-w-2xl text-base leading-7 text-slate-600 sm:text-lg sm:leading-8">
            Have feedback, need support, or interested in partnering with us?
            We&apos;d love to hear from you. Cognitive Wizard is building a
            practical AI learning platform for students, educators, and
            creators.
          </p>
        </motion.div>

        {/* Contact cards */}
        <div className="mx-auto grid w-full max-w-4xl gap-6 md:grid-cols-2">
          {contactItems.map((item, idx) => {
            const Icon = item.icon;

            const CardContent = (
              <>
                {/* Card glow */}
                <div className="absolute -right-16 -top-16 h-32 w-32 rounded-full bg-primary/5 blur-2xl transition-all duration-500 group-hover:bg-primary/10" />

                <div className="relative flex h-full flex-col">
                  {/* Icon + label */}
                  <div className="mb-8 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-accent/40 text-primary transition-transform duration-300 group-hover:scale-105 group-hover:rotate-1">
                        <Icon size={25} strokeWidth={2} />
                      </div>

                      <div>
                        <p className="text-sm font-medium uppercase tracking-wider text-slate-400">
                          Contact
                        </p>
                        <h2 className="text-lg font-bold text-dark">
                          {item.label}
                        </h2>
                      </div>
                    </div>

                    {item.href && (
                      <div className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 text-slate-400 transition-all duration-300 group-hover:border-primary/20 group-hover:bg-primary group-hover:text-white">
                        <ArrowUpRight size={17} />
                      </div>
                    )}
                  </div>

                  {/* Content */}
                  <div className="mt-auto">
                    <p className="break-words text-xl font-bold tracking-tight text-dark sm:text-2xl">
                      {item.value}
                    </p>

                    <p className="mt-3 text-sm leading-6 text-slate-500">
                      {item.sub}
                    </p>

                    {item.href && (
                      <p className="mt-6 text-sm font-semibold text-primary">
                        Send us an email →
                      </p>
                    )}
                  </div>
                </div>
              </>
            );

            return item.href ? (
              <motion.a
                key={item.label}
                href={item.href}
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{
                  duration: 0.5,
                  delay: 0.15 + idx * 0.1,
                  ease: "easeOut",
                }}
                whileHover={{ y: -6 }}
                className="group relative min-h-[270px] overflow-hidden rounded-[2rem] border border-slate-200/80 bg-white p-7 shadow-sm transition-shadow duration-300 hover:shadow-xl hover:shadow-slate-200/60 sm:p-8"
              >
                {CardContent}
              </motion.a>
            ) : (
              <motion.div
                key={item.label}
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{
                  duration: 0.5,
                  delay: 0.15 + idx * 0.1,
                  ease: "easeOut",
                }}
                whileHover={{ y: -6 }}
                className="group relative min-h-[270px] overflow-hidden rounded-[2rem] border border-slate-200/80 bg-white p-7 shadow-sm transition-shadow duration-300 hover:shadow-xl hover:shadow-slate-200/60 sm:p-8"
              >
                {CardContent}
              </motion.div>
            );
          })}
        </div>

        {/* Bottom message */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.65, duration: 0.6 }}
          className="mx-auto mt-10 flex max-w-2xl items-center justify-center gap-3 text-center"
        >
          <div className="h-px flex-1 bg-slate-200" />

          <p className="px-3 text-xs font-medium uppercase tracking-widest text-slate-400 sm:text-sm">
            We&apos;re here to help
          </p>

          <div className="h-px flex-1 bg-slate-200" />
        </motion.div>
      </div>
    </section>
  );
}