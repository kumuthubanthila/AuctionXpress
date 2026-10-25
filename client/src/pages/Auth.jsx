import { useState } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router'
import { landing, useAuth } from '../context/AuthContext'
import { ErrorNotice, Loading } from '../components/Feedback'

export default function Auth({ signup = false }) {
  const auth = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [values, setValues] = useState({ role: 'buyer', firstName: '', lastName: '', email: '', contactNo: '', username: '', password: '', confirm: '' })
  const [error, setError] = useState(null)
  const [pending, setPending] = useState(false)
  if (auth.loading) return <Loading label="Checking your session…" />
  if (auth.user) return <Navigate to={landing(auth.user)} replace />
  const fields = signup ? [['firstName','First name','text'],['lastName','Last name','text'],['email','Email address','email'],['contactNo','Contact number','tel'],['username','Username','text'],['password','Password','password'],['confirm','Confirm password','password']] : [['username','Username','text'],['password','Password','password']]
  async function submit(event) {
    event.preventDefault(); setError(null)
    if (signup && values.password !== values.confirm) { setError(new Error('Passwords do not match')); return }
    setPending(true)
    try {
      const { confirm, ...body } = values
      const user = await auth.authenticate(signup ? 'signup' : 'login', signup ? body : { username: values.username, password: values.password })
      const from = location.state?.from
      navigate(!signup && from?.startsWith('/') && !from.startsWith('//') ? from : landing(user), { replace: true })
    } catch (failure) { setError(failure) } finally { setPending(false) }
  }
  return <section className="auth-layout section"><div className="auth-intro"><p className="eyebrow">YOUR NEXT CHAPTER</p><h1>{signup ? 'A place for buyers. A home for sellers.' : 'Welcome back to the auction house.'}</h1><p>{signup ? 'Discover great finds as a buyer, or share your own as a seller. Choose how you want to join.' : 'Log in to follow your bids, manage your listings, or visit the admin workspace.'}</p><div className="tips"><h3>One marketplace. Three workspaces.</h3><p>Buyers bid on approved auctions. Sellers list and manage their own items. Admins review listings and keep everything organized.</p></div></div><form className="panel account-form" onSubmit={submit}><p className="eyebrow">{signup ? 'JOIN AUCTIONXPRESS' : 'SIGN IN'}</p><h2>{signup ? 'Create your account' : 'Log in'}</h2><ErrorNotice error={error} /><fieldset disabled={pending}>
    {signup && <div className="role-options" role="group" aria-label="Account type">{['buyer','seller'].map((role) => <label key={role} className={values.role === role ? 'role-option selected' : 'role-option'}><input type="radio" name="role" value={role} checked={values.role === role} onChange={() => setValues({ ...values, role })} /><strong>{role === 'buyer' ? 'I want to buy' : 'I want to sell'}</strong><small>{role === 'buyer' ? 'Discover & place bids' : 'List & manage auctions'}</small></label>)}</div>}
    <div className={signup ? 'account-fields' : ''}>{fields.map(([key,label,type]) => <div key={key}><label htmlFor={`auth-${key}`}>{label}</label><input id={`auth-${key}`} type={type} value={values[key]} autoComplete={key === 'username' ? 'username' : key === 'password' ? signup ? 'new-password' : 'current-password' : key === 'confirm' ? 'new-password' : key === 'email' ? 'email' : key === 'contactNo' ? 'tel' : key === 'firstName' ? 'given-name' : 'family-name'} minLength={signup && ['password','confirm'].includes(key) ? 8 : undefined} maxLength={['password','confirm'].includes(key) ? 128 : key === 'username' ? 30 : key === 'contactNo' ? 30 : key === 'email' ? 254 : 80} pattern={signup && key === 'username' ? '[a-zA-Z0-9_]{3,30}' : undefined} value-as-text={undefined} required onChange={(event) => setValues({ ...values, [key]: event.target.value })} /></div>)}</div>
    {signup && <p className="field-hint">Passwords need at least 8 characters. Usernames use 3–30 letters, numbers, or underscores.</p>}<button className="button full">{pending ? 'Please wait…' : signup ? `Sign up as ${values.role}` : 'Log in'}</button></fieldset><p className="account-switch">{signup ? 'Already have an account?' : 'New to AuctionXPress?'} <Link className="text-link" to={signup ? '/login' : '/signup'}>{signup ? 'Log in' : 'Create an account'}</Link></p></form></section>
}
