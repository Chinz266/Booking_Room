export function PageHeading({eyebrow,title,description}:{eyebrow:string;title:string;description:string}) {
  return <section className="page-header shell"><p className="eyebrow">{eyebrow}</p><h1>{title}</h1><p>{description}</p></section>;
}
