import { useEffect, useRef, useState } from 'react'
import { api } from '../lib/api'
import { ErrorNotice } from './Feedback'

function Confirmation({ auction, close, onDeleted }) {
	const dialog = useRef(null)
	const [pending, setPending] = useState(false)
	const [error, setError] = useState(null)
	useEffect(() => {
		const element = dialog.current
		element.showModal()
		return () => element.close()
	}, [])
	async function remove() {
		setPending(true)
		setError(null)
		try { await api(`/auctions/${auction._id}`, { method: 'DELETE' }); onDeleted(); close() }
		catch (failure) { setError(failure); setPending(false) }
	}
	return <dialog ref={dialog} className="confirm-dialog" aria-labelledby="delete-title" onCancel={(event) => { if (pending) event.preventDefault(); else close() }}><span className="eyebrow">PLEASE CONFIRM</span><h2 id="delete-title">Delete this auction?</h2><p>“{auction.title}” and its bid history will be permanently removed.</p><ErrorNotice error={error} /><div className="action-row"><button autoFocus className="button secondary" disabled={pending} onClick={close}>Keep auction</button><button className="button danger" disabled={pending} onClick={remove}>{pending ? 'Deleting…' : 'Delete auction'}</button></div></dialog>
}
export default function DeleteAuction({ auction, onDeleted }) {
	const [confirm, setConfirm] = useState(false)
	return <><button className="button danger-ghost small" onClick={() => setConfirm(true)}>Delete</button>{confirm && <Confirmation auction={auction} close={() => setConfirm(false)} onDeleted={onDeleted} />}</>
}
