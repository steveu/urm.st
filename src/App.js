import React from 'react'
import { Router } from 'react-static'
import Routes from 'react-static-routes'

// Hot loading development
import { hot } from 'react-hot-loader'

// Components
import Header from './components/Header'
import Footer from './components/Footer'

// Styles
import './app.scss'

const App = () => (
  <Router>
    <div className="container">
      <Header />
      <div className="content">
        <Routes />
      </div>
      <Footer />
    </div>
  </Router>
)

export default hot(module)(App)
