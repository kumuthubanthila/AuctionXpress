import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import UserForm from '../components/UserForm'
export default function Profile() {
	const { user, setUser } = useAuth()
	const [saved, setSaved] = useState(false)
	return <section className="section page-section"><div className="page-heading"><p className="eyebrow">YOUR ACCOUNT · {user.role}</p><h1>Hello, {user.firstName}.</h1><p>Manage your contact details and password. Your username and role stay the same.</p></div>{saved && <div className="notice success" role="status">Profile updated.</div>}<UserForm initial={user} onSaved={(updated) => { setUser(updated); setSaved(true) }} /></section>
}
