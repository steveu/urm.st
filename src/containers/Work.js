import React from 'react'
import { withRouteData, Head } from 'react-static'

import Projects from '../components/Projects'

export default withRouteData(({ projects }) => (
  <div>
    <Head>
      <title>Steven Urmston | Work</title>
    </Head>
    <Projects items={projects}></Projects>
  </div>
))
