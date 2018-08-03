import React from 'react'
import { withRouteData, Link } from 'react-static'
import convert from 'htmr'
import steve from '../images/steve.jpg'
import steveLandscape from '../images/steve-landscape.jpg'

export default withRouteData(({ about }) => (
  <section className="">
    <div className="grid-wrapper about">
      <figure className="about__image">
        <picture>
          <source media="(min-width: 34em)" srcset={steve} />
          <source media="(min-width: 0px)" srcset={steveLandscape} />
          <img src={steve} alt="Steve Urmston - Digital Product Designer" />
        </picture>

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
