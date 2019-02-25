import React, { Component } from 'react'
import { RouteData, Head } from 'react-static'

import AnimatedRoute from '../components/AnimatedRoute'
import Projects from '../components/Projects'
const AnimatedProjects = AnimatedRoute(Projects);

class WorkContainer extends Component {
  shouldComponentUpdate() {
    return false;
  }
  render() {
    return (
      <RouteData>
        {({ projects }) => (
          <div>
            <Head>
              <title>Steve Urmston | Work</title>
              <meta name="description" content="UI Design and Frontend Developer portfolio of Steve Urmston" />
            </Head>
            <AnimatedProjects projects={projects} />
          </div>
        )}
      </RouteData>
    )
  }
}

export default WorkContainer
