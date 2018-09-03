import React from 'react'
import { withRouteData, Head } from 'react-static'
import convert from 'htmr'

import AnimatedRoute from '../components/AnimatedRoute'
import About from '../components/About'
const AnimatedAbout = AnimatedRoute(About);

export default withRouteData(({ about }) => (
  <div>
    <Head>
      <title>Steve Urmston | About</title>
    </Head>
    <AnimatedAbout contents={convert(about.contents)} />
  </div>
))
