import React from 'react'
import { Link } from 'react-static'

import Icon from '../Icon'

const Header = (props) => (
  <header>
    <div className="grid-wrapper" role="navigation">
      <h1>
        <Link to="/">
          <Icon name="star" width="30" height="30" />
          Steven Urmston
        </Link>
      </h1>
      <nav>
        <Link to="/work">
          <span>Work</span>
        </Link>
        <Link to="/about">
          <span>About</span>
        </Link>
        <Link to="/resume">
          <span>Resume</span>
        </Link>
      </nav>
    </div>
  </header>
)

export default Header