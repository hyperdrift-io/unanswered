import { Link } from 'waku';

export default function NotFoundPage() {
  return (
    <>
      <title>No one asked this — Unanswered</title>
      <meta name="robots" content="noindex,follow" />
      <h1>No one asked this.</h1>
      <p>There is no page at this address. The questions still waiting for an answer are back home.</p>
      <p>
        <Link to="/">Back to the questions</Link>
      </p>
    </>
  );
}

export const getConfig = async () => {
  return { render: 'static' } as const;
};
