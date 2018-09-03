import React from 'react'
import { withRouteData, Head } from 'react-static'

import AnimatedRoute from '../components/AnimatedRoute'
import Projects from '../components/Projects'
const AnimatedProjects = AnimatedRoute(Projects);

export default withRouteData(({ projects }) => (
  <div>
    <Head>
      <title>Steve Urmston | Work</title>
      <meta name="description" content="Digital Product Designer portfolio of Steve Urmston" />
    </Head>
    <AnimatedProjects projects={projects} />
  </div>
))
