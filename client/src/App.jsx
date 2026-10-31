import { BrowserRouter, Route, Routes } from 'react-router'
import Layout from './components/Layout'
import Home from './pages/Home'
import Browse from './pages/Browse'
import AuctionDetails from './pages/AuctionDetails'
import AuctionEditor from './pages/AuctionEditor'
import Dashboard from './pages/Dashboard'
import { EmptyState } from './components/Feedback'
import './App.css'
import './Activity.css'
import './Messaging.css'
import { AuthProvider, Protected } from './context/AuthContext'
import Auth from './pages/Auth'
import Profile from './pages/Profile'
import Admin from './pages/Admin'
import Sellers from './pages/Sellers'
import Contact from './pages/Contact'
import About from './pages/About'
import Checkout from './pages/Checkout'
import Messages from './pages/Messages'
import Winnings from './pages/Winnings'

export default function App() {
	return <BrowserRouter><AuthProvider><Routes><Route element={<Layout />}>
		<Route index element={<Home />} />
		<Route path="auctions" element={<Browse />} />
		<Route path="auctions/new" element={<Protected roles={['seller','admin']}><AuctionEditor /></Protected>} />
		<Route path="auctions/:id" element={<AuctionDetails />} />
		<Route path="auctions/:id/edit" element={<Protected roles={['seller','admin']}><AuctionEditor /></Protected>} />
		<Route path="dashboard" element={<Protected><Dashboard /></Protected>} />
		<Route path="winnings" element={<Protected roles={['buyer']}><Winnings /></Protected>} />
		<Route path="signup" element={<Auth key="signup" signup />} />
		<Route path="login" element={<Auth key="login" />} />
		<Route path="profile" element={<Protected><Profile /></Protected>} />
		<Route path="messages" element={<Protected roles={['buyer', 'seller']}><Messages /></Protected>} />
		<Route path="admin" element={<Protected roles={['admin']}><Admin /></Protected>} />
		<Route path="sellers" element={<Protected><Sellers /></Protected>} />
		<Route path="contact" element={<Protected><Contact /></Protected>} />
		<Route path="about" element={<About />} />
		<Route path="auctions/:id/checkout" element={<Protected roles={['buyer']}><Checkout /></Protected>} />
		<Route path="*" element={<EmptyState title="Page not found" message="Explore the latest auctions to find your next discovery." to="/auctions" action="Browse auctions" />} />
	</Route></Routes></AuthProvider></BrowserRouter>
}
