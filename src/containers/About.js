import React from 'react'
import { withRouteData, Head } from 'react-static'
import convert from 'htmr'

export default withRouteData(({ about }) => (
  <div>
    <Head>
      <title>Steven Urmston | About</title>
    </Head>
    <section className="">
      <div className="grid-wrapper about">
        <figure className="about__image">
          <picture>
            <source media="(min-width: 34em)" srcSet="/assets/images/steve.jpg" />
            <source media="(min-width: 0px)" srcSet="/assets/images/steve-landscape.jpg" />
            <img src="/assets/images/steve.jpg" alt="Steve Urmston - Digital Product Designer" />
          </picture>
        </figure>
        <aside>
          {convert(about.contents)}
        </aside>
      </div>
    </section>
  </div>
))
