import { Link, useParams } from "react-router-dom";
import { PHOTOS } from "../photos.js";
import { postBySlug, sortedPosts } from "../blog.js";
import { PageHead } from "../components.jsx";
import { NotFound } from "./Simple.jsx";

const dateText = (date) => new Date(`${date}T12:00:00`).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });

/** A post's picture: a key from photos.js, or a path to a file in site/public. */
export function PostPhoto({ post, eager = false }) {
  const picture = PHOTOS[post.photo] ?? { src: post.photo, alt: "" };
  return (
    <div className="post-photo">
      {picture.src && <img src={picture.src} alt={picture.alt} loading={eager ? "eager" : "lazy"} decoding="async" />}
    </div>
  );
}

export function PostCard({ post }) {
  return (
    <li>
      <Link to={`/blog/${post.slug}`} className="post-card">
        <PostPhoto post={post} />
        <p className="caps quiet">{post.tag} · {dateText(post.date)}</p>
        <h3>{post.title}</h3>
        <p className="quiet">{post.description}</p>
      </Link>
    </li>
  );
}

export default function Blog() {
  const posts = sortedPosts();
  return (
    <div className="page">
      <PageHead eyebrow="Blog" title="Ideas and guides for your celebration">
        <p className="quiet">Budgets, checklists and advice for introductions, weddings, giveaways, graduations and parties across Uganda.</p>
      </PageHead>
      <ul className="post-grid">
        {posts.map((post) => <PostCard key={post.slug} post={post} />)}
      </ul>
    </div>
  );
}

export function BlogPost() {
  const { slug } = useParams();
  const post = postBySlug(slug);
  if (!post) return <NotFound />;
  const others = sortedPosts().filter((p) => p.slug !== slug).slice(0, 3);
  return (
    <div className="page">
      <article className="post">
        <p className="caps"><Link to="/blog" className="link-quiet">Blog</Link> · {post.tag}</p>
        <h1>{post.title}</h1>
        <p className="lead quiet">{post.description}</p>
        <p className="quiet post-by">{post.author} · <time dateTime={post.date}>{dateText(post.date)}</time></p>
        <PostPhoto post={post} eager />
        <div className="post-body">
          {post.body.map((block, index) =>
            typeof block === "string" ? <p key={index}>{block}</p>
              : block.h ? <h2 key={index}>{block.h}</h2>
              : block.list ? <ul key={index}>{block.list.map((item) => <li key={item}>{item}</li>)}</ul>
              : null,
          )}
        </div>
        <div className="post-end">
          <Link to="/budget" className="button fit sun">Try the budget planner</Link>
          <Link to="/services" className="link-caps">Browse services</Link>
        </div>
      </article>
      {others.length > 0 && (
        <section className="block">
          <div className="block-head"><h2>More from the blog</h2><Link to="/blog" className="link-caps">All posts</Link></div>
          <ul className="post-grid">{others.map((p) => <PostCard key={p.slug} post={p} />)}</ul>
        </section>
      )}
    </div>
  );
}
