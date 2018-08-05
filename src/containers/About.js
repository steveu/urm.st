import React from 'react'
import { withRouteData, Link, Head } from 'react-static'
import convert from 'htmr'
import steve from '../images/steve.jpg'
import steveLandscape from '../images/steve-landscape.jpg'

export default withRouteData(({ about }) => (
  <div>
    <Head>
      <title>Steven Urmston | About</title>
    </Head>
    <section className="">
      <div className="grid-wrapper about">
        <figure className="about__image">
          <picture>
            <source media="(min-width: 34em)" srcSet={steve} />
            <source media="(min-width: 0px)" srcSet={steveLandscape} />
            <img src={steve} alt="Steve Urmston - Digital Product Designer" />
          </picture>

        </figure>
        <aside>
          {convert(about.contents)}
        </aside>
      </div>
    </section>
  </div>
))
