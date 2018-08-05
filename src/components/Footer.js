import React from 'react'
// import { Link } from 'react-static'

// import Icon from '../Icon'

const Footer = (props) => (
  <footer id="footer">
    <div className="grid-wrapper">
      <p>
        Find me on
        <a href="https://twitter.com/steveu">Twitter</a>,&nbsp;
        <a href="https://github.com/steveu">GitHub</a> and&nbsp;
        <a href="https://www.linkedin.com/in/steveurmston/">LinkedIn</a>. Send email to&nbsp;
        <a href="mailto:steve@urm.st">steve@urm.st</a>.
      </p>

      <a
        rel="license"
        href="http://creativecommons.org/licenses/by-nc/4.0/"
      >
        <img
          alt="Creative Commons License"
          src="https://i.creativecommons.org/l/by-nc/4.0/88x31.png"
        />
      </a>
    </div>
  </footer>
)

export default Footer