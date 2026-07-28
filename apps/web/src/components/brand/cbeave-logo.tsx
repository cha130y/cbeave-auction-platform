import { cn } from "@/lib/utils/cn";

type CBeaveLogoProps = {
  className?: string;
  compact?: boolean;
};

export function CBeaveLogo({
  className,
  compact = false,
}: CBeaveLogoProps) {
  return (
    <div
      className={cn("inline-flex items-center gap-3", className)}
      aria-label="CBeave"
    >
      <span className="relative grid size-10 shrink-0 place-items-center overflow-hidden rounded-xl bg-linear-to-br from-accent via-[#734cff] to-primary shadow-[0_0_28px_rgba(0,229,255,0.18)]">
        <span
          className="text-[23px] leading-none font-black text-white"
          aria-hidden="true"
        >
          ϟ
        </span>
      </span>
      {!compact && (
        <span className="text-[1.7rem] leading-none font-extrabold tracking-[-0.055em] text-white">
          C<span className="text-primary">Beave</span>
        </span>
      )}
    </div>
  );
}
