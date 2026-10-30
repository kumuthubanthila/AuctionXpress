import { useEffect, useRef, useState } from 'react'
import { api } from '../lib/api'
import { ErrorNotice } from './Feedback'

export default function DeleteAccountDialog({ account, onCancel, onDeleted }) {
	const dialog = useRef(null)
	const [pending, setPending] = useState(false)
	const [error, setError] = useState(null)

	useEffect(() => {
		const element = dialog.current
		element.showModal()
		return () => element.close()
	}, [])

	async function remove() {
		if (pending) return
		setPending(true)
		setError(null)
		try {
			const response = await api(`/admin/users/${account._id}`, { method: 'DELETE' })
			onDeleted(account._id, response.message)
		} catch (failure) {
			setError(failure)
			setPending(false)
		}
	}

	return <dialog
		ref={dialog}
		className="confirm-dialog"
		aria-labelledby="delete-account-title"
		aria-describedby="delete-account-description"
		onCancel={(event) => { if (pending) event.preventDefault(); else onCancel() }}
	>
		<span className="eyebrow">PLEASE CONFIRM</span>
		<h2 id="delete-account-title">Delete this account?</h2>
		<p id="delete-account-description">The account “{account.username}” will be permanently deleted and logged out on every device. Auction and bid history will remain. This cannot be undone.</p>
		<ErrorNotice error={error} />
		<div className="action-row">
			<button autoFocus type="button" className="button secondary" disabled={pending} onClick={onCancel}>Keep account</button>
			<button type="button" className="button danger" disabled={pending} onClick={remove}>{pending ? 'Deleting…' : 'Delete account'}</button>
		</div>
	</dialog>
}
