import React, { Component } from 'react'
import { RouteData, Head } from 'react-static'
import convert from 'htmr'

import AnimatedRoute from '../components/AnimatedRoute'
import Home from '../components/Home'
const AnimatedHome = AnimatedRoute(Home);

class HomeContainer extends Component {
  shouldComponentUpdate() {
    return false;
  }
  render() {
    return (
      <RouteData>
        {({ home, projects }) => (
          <div>
            <Head>
              <title>Steve Urmston | UI Designer & Frontend Developer</title>
              <meta name="description" content="Personal portolio of Steve Urmston, a Frontend Developer and UI Designer based in York, UK" />
            </Head>
            <AnimatedHome
              contents={convert(home.contents)}
              projects={projects}
            />
          </div>
        )}
      </RouteData>
    )
  }
}

export default HomeContainer
