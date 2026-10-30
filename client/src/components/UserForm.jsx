import { useState } from 'react'
import { ErrorNotice } from './Feedback'
import { api } from '../lib/api'

export default function UserForm({ initial, role = 'buyer', admin = false, onSaved, onCancel }) {
	const [values, setValues] = useState({ firstName: initial?.firstName || '', lastName: initial?.lastName || '', email: initial?.email || '', contactNo: initial?.contactNo || '', username: initial?.username || '', password: '', role })
	const [pending, setPending] = useState(false)
	const [error, setError] = useState(null)
	const relaxed = admin && Boolean(initial)
	const [replacePassword, setReplacePassword] = useState(false)

	async function submit(event) {
		event.preventDefault()
		setPending(true)
		setError(null)
		const body = { firstName: values.firstName, lastName: values.lastName, email: values.email, contactNo: values.contactNo }
		if (relaxed ? replacePassword : admin || Boolean(values.password)) body.password = values.password
		if (!initial) { body.username = values.username; body.role = role }
		try {
			const response = await api(admin ? initial ? `/admin/users/${initial._id}` : '/admin/users' : '/auth/profile', { method: initial ? 'PUT' : 'POST', body })
			onSaved(response.data)
		} catch (failure) {
			setError(failure)
		} finally {
			setPending(false)
		}
	}

	const fields = [['firstName', 'First name', 'text'], ['lastName', 'Last name', 'text'], ['email', 'Email', 'email'], ['contactNo', 'Contact number', 'tel'], ['username', 'Username', 'text'], ['password', initial ? 'New password (optional)' : 'Password', 'password']]
	return <form className="panel account-form" onSubmit={submit} noValidate={admin}>
		<h2>{initial ? 'Edit profile' : `Add ${role}`}</h2>
		<ErrorNotice error={error} />
		<fieldset disabled={pending}>
			<div className="account-fields">{fields.map(([key, label, type]) => <div key={key}>
				<label htmlFor={`user-${key}`}>{label}</label>
				<input id={`user-${key}`} type={admin && type === 'email' ? 'text' : type} disabled={key === 'username' && Boolean(initial) || (relaxed && key === 'password' && !replacePassword)} minLength={!admin && key === 'password' ? 8 : undefined} maxLength={key === 'password' ? 128 : key === 'email' ? 254 : key === 'contactNo' || key === 'username' ? 30 : 80} autoComplete={key === 'password' ? 'new-password' : undefined} required={!admin && (key !== 'password' || !initial)} value={values[key]} onChange={(event) => setValues({ ...values, [key]: event.target.value })} />
			</div>)}</div>
			{relaxed && <label className="password-reset-choice"><input type="checkbox" checked={replacePassword} onChange={(event) => setReplacePassword(event.target.checked)} /> Replace password (leave the password field blank to clear it)</label>}
			{relaxed && <p className="field-hint">Admin edits allow blank details and passwords of 0–128 characters. Leave Replace password unchecked to keep the current password.</p>}
			<div className="action-row"><button className="button">{pending ? 'Saving…' : 'Save account'}</button>{onCancel && <button type="button" className="button secondary" onClick={onCancel}>Cancel</button>}</div>
		</fieldset>
	</form>
}
