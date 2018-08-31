import React from 'react'

const Footer = (props) => (
  <footer role="contentinfo">
    <div className="grid-wrapper">
      <p>
        Find me on&nbsp;
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
          src="/assets/images/licence.png"
        />
      </a>
    </div>
  </footer>
)

export default Footer