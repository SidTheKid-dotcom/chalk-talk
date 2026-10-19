type PhotoCreditsLinkProps = {
  href?: string;
};

export function PhotoCreditsLink({ href = '/lab/credits' }: PhotoCreditsLinkProps) {
  return (
    <a href={href} className="photo-credits-link font-courier text-[12px] underline">
      Photo credits
    </a>
  );
}
