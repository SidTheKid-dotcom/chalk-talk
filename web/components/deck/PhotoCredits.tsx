type PhotoCreditsLinkProps = {
  href?: string;
};

export function PhotoCreditsLink({ href = '/lab/credits' }: PhotoCreditsLinkProps) {
  return (
    <a href={href} className="photo-credits-link font-courier shrink-0 text-[12px] underline">
      Photo credits
    </a>
  );
}
