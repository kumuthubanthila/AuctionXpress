import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { api } from '../lib/api'
import { ErrorNotice } from '../components/Feedback'
export default function Contact() {
  const { user } = useAuth()
  const [values, setValues] = useState({ name: `${user.firstName} ${user.lastName}`, email: user.email, subject: '', message: '' })
  const [error, setError] = useState(null)
  const [pending, setPending] = useState(false)
  const [sent, setSent] = useState(false)
  async function submit(event) {
    event.preventDefault(); setError(null); setSent(false); setPending(true)
    try { await api('/messages', { method: 'POST', body: values }); setSent(true); setValues({ ...values, subject: '', message: '' }) }
    catch (failure) { setError(failure) } finally { setPending(false) }
  }
  return <section className="section page-section"><div className="page-heading"><p className="eyebrow">WE'RE LISTENING</p><h1>Contact the auction house.</h1><p>Questions, feedback, or a little help? Send a message to the admin team.</p></div><form className="panel account-form" onSubmit={submit}><ErrorNotice error={error} />{sent && <div className="notice success" role="status">Your message was sent to the admin inbox.</div>}<fieldset disabled={pending}>{[['name','Your name',160],['email','Email address',254],['subject','Subject',200],['message','Message',5000]].map(([key,label,max]) => <div key={key}><label htmlFor={`contact-${key}`}>{label}</label>{key === 'message' ? <textarea id={`contact-${key}`} required maxLength={max} rows={6} value={values[key]} onChange={(event) => setValues({ ...values, [key]: event.target.value })} /> : <input id={`contact-${key}`} type={key === 'email' ? 'email' : 'text'} required maxLength={max} value={values[key]} onChange={(event) => setValues({ ...values, [key]: event.target.value })} />}</div>)}<button className="button">{pending ? 'Sending…' : 'Send message ↗'}</button></fieldset></form></section>
}
