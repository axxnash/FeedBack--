import { navigateTo } from "../lib/navigation";

export default function Footer() {
  return (
    <footer className="relative z-10 mt-10 border-t border-[#e8eddc] bg-[linear-gradient(180deg,#fafbf7_0%,#f5f7f1_100%)] py-12">
      <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-8 px-4 sm:px-6 md:flex-row">
        <div className="flex flex-col items-center gap-4 text-center md:flex-row md:text-left">
          <h2 className="font-display text-h2 text-[#16351a]">FeedBack</h2>
          <span className="hidden h-4 w-px bg-[#d9dfd1] md:block"></span>
          <p className="font-body-md text-body-md italic text-[#647064]">
            Start rescuing. Share your surplus.
          </p>
        </div>

        <div className="flex flex-wrap justify-center gap-x-6 gap-y-3 text-sm font-semibold text-[#5d685d]">
          <button type="button" onClick={() => navigateTo("/privacy-policy")} className="transition-colors duration-300 hover:text-[#4f9218]">
            Privacy Policy
          </button>
          <button type="button" onClick={() => navigateTo("/terms-of-service")} className="transition-colors duration-300 hover:text-[#4f9218]">
            Terms of Service
          </button>
          <button type="button" onClick={() => navigateTo("/contact-us")} className="transition-colors duration-300 hover:text-[#4f9218]">
            Contact Us
          </button>
          <button type="button" onClick={() => navigateTo("/partner-with-us")} className="transition-colors duration-300 hover:text-[#4f9218]">
            Partner With Us
          </button>
        </div>
      </div>
    </footer>
  );
}
