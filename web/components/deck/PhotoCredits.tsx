type PhotoCreditsLinkProps = {
  href?: string;
};

export function PhotoCreditsLink({ href = '/lab/credits' }: PhotoCreditsLinkProps) {
  return (
    <a href={href} className="photo-credits-link underline">
      Photo credits
    </a>
  );
}
