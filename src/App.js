import React from 'react'
import { Router } from 'react-static'
import Routes from 'react-static-routes'

// Components
import Header from './components/Header'
import Footer from './components/Footer'

// Styles
import './app.scss'
import './icons.svg'

const App = () => (
  <Router>
    <div className="container">
      <Header />
      <div className="content" role="main">
        <Routes />
      </div>
      <Footer />
    </div>
  </Router>
)

export default App
