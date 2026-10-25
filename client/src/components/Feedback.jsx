import { Link } from 'react-router'

export function Loading({ label = 'Loading auctions…' }) {
  return <div className="loading" role="status"><span className="spinner" />{label}</div>
}
export function ErrorNotice({ error, retry }) {
  if (!error) return null
  return <div className="notice error" role="alert"><div><strong>Something needs your attention</strong><p>{error.message || String(error)}</p>{error.errors && Object.entries(error.errors).length > 0 && <ul>{Object.entries(error.errors).map(([field, message]) => <li key={field}>{field}: {message}</li>)}</ul>}</div>{retry && <button className="button small secondary" onClick={retry}>Try again</button>}</div>
}
export function EmptyState({ title = 'No auctions here yet.', message = 'Be the first to put something special on the block.', to = '/auctions/new', action = 'Create an auction' }) {
  return <div className="empty"><span className="empty-symbol" aria-hidden="true">◇</span><h2>{title}</h2><p>{message}</p>{to && <Link className="button" to={to}>{action} <span aria-hidden="true">↗</span></Link>}</div>
}
