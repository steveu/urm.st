import React from 'react'
import { withRouteData, Link } from 'react-static'
import convert from 'htmr'

import steve from '../images/steve2.jpg'

export default withRouteData(({ about }) => (
  <section className="">
    <div className="grid-wrapper about">
      <figure className="about__image">
        <img src={ steve } />
      </figure>
      <aside>
        {convert(about.contents)}
        <Link className="button" to="/contact/">
          Find me on LinkedIn
        </Link>
      </aside>
    </div>
  </section>
))
