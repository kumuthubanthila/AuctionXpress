import { useState } from 'react'
import { Link } from 'react-router'
import { useAuth } from '../context/AuthContext'
import useApi from '../hooks/useApi'
import { ErrorNotice, Loading } from './Feedback'
import UserForm from './UserForm'
import DeleteAccountDialog from './DeleteAccountDialog'

export function AccountDeleteButton({ account, currentUser, onClick }) {
	const protectedAccount = account.username === 'admin' || account._id === currentUser?._id
	return <button
		type="button"
		className="button danger-ghost small"
		disabled={protectedAccount}
		title={protectedAccount ? 'The main admin and your own account cannot be deleted' : `Delete ${account.username}`}
		onClick={onClick}
	>Delete</button>
}

export default function AdminUsers({ role }) {
	const { user: currentUser } = useAuth()
	const resource = useApi(`/admin/users?role=${role}`)
	const [editing, setEditing] = useState(null)
	const [adding, setAdding] = useState(false)
	const [deleting, setDeleting] = useState(null)
	const [deletedIds, setDeletedIds] = useState([])
	const [success, setSuccess] = useState('')
	const accounts = (resource.data?.data || []).filter((user) => !deletedIds.includes(user._id))

	function deleted(id, message) {
		// Remove the confirmed account immediately, even if the next refresh fails.
		setDeletedIds((previous) => [...previous, id])
		setEditing((previous) => previous?._id === id ? null : previous)
		setDeleting(null)
		setSuccess(message)
		resource.refresh()
	}

	return <>
		<div className="section-heading">
			<h2>{role[0].toUpperCase() + role.slice(1)} accounts</h2>
			<button className="button small" onClick={() => { setAdding(true); setEditing(null) }}>Add {role} +</button>
		</div>
		<p className="field-hint">Delete permanently removes an account and logs it out. Auction and bid history is kept. The main admin and your own account are protected.</p>
		{success && <div className="notice success" role="status">{success}</div>}
		<ErrorNotice error={resource.error} retry={resource.refresh} />
		{(adding || editing) && <UserForm
			key={editing?._id || 'new'}
			role={role}
			admin
			initial={editing}
			onCancel={() => { setAdding(false); setEditing(null) }}
			onSaved={() => { setAdding(false); setEditing(null); setSuccess('Account saved.'); resource.refresh() }}
		/>}
		{resource.loading && !resource.data ? <Loading label="Loading accounts…" /> : resource.data && <div className="table-wrap panel" aria-busy={resource.loading}>
			<table>
				<caption className="sr-only">{role} accounts</caption>
				<thead><tr><th scope="col">Username / name</th><th scope="col">Email / contact</th><th scope="col">Status</th><th scope="col">Actions</th></tr></thead>
				<tbody>{accounts.map((account) => <tr key={account._id}>
					<td><strong>{account.username}</strong><small>{account.firstName} {account.lastName}</small></td>
					<td>{account.email}<small>{account.contactNo}</small></td>
					<td>{account.active ? 'Active' : 'Inactive'}</td>
					<td><div className="action-row">
						<button className="button secondary small" onClick={() => { setEditing(account); setAdding(false) }}>Edit</button>
						{role === 'seller' && <Link className="text-link" to={`/admin?tab=items&seller=${encodeURIComponent(account.username)}`}>View items</Link>}
						<AccountDeleteButton account={account} currentUser={currentUser} onClick={() => setDeleting(account)} />
					</div></td>
				</tr>)}{!accounts.length && <tr><td colSpan="4">No {role} accounts yet.</td></tr>}</tbody>
			</table>
		</div>}
		{deleting && <DeleteAccountDialog account={deleting} onCancel={() => setDeleting(null)} onDeleted={deleted} />}
	</>
}
