import React from 'react'
import { withRouteData, Head } from 'react-static'
import convert from 'htmr'

export default withRouteData(({ about }) => (
  <div className="animated">
    <Head>
      <title>Steve Urmston | About</title>
    </Head>
    <section className="about">
      <div className="grid-wrapper">
        <figure className="about__image">
          <picture>
            <source media="(min-width: 44.01em)" srcSet="/assets/images/steve-urmston.jpg" />
            <source media="(min-width: 0px)" srcSet="/assets/images/steve-urmston.landscape.jpg" />
            <img src="/assets/images/steve-urmston.jpg" alt="Steve Urmston - Digital Product Designer" />
          </picture>
        </figure>
        <aside>
          {convert(about.contents)}
        </aside>
      </div>
    </section>
  </div>
))
