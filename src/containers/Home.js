import React from 'react'
import { withRouteData, Head } from 'react-static'
import convert from 'htmr'

import AnimatedRoute from '../components/AnimatedRoute'
import Home from '../components/Home'
const AnimatedHome = AnimatedRoute(Home);

export default withRouteData(({ home, projects }) => (
  <div>
    <Head>
      <title>Steve Urmston | Full Stack Digital Product Designer</title>
      <meta name="description" content="Personal portolio of Steve Urmston, a Digital Product Designer based in York, UK" />
    </Head>
    <AnimatedHome
      contents={convert(home.contents)}
      projects={projects}
    />
  </div>
))