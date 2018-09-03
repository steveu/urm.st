import React, { Component } from 'react'
import { RouteData, Head } from 'react-static'
import convert from 'htmr'

import AnimatedRoute from '../components/AnimatedRoute'
import About from '../components/About'
const AnimatedAbout = AnimatedRoute(About);

 class AboutContainer extends Component {
  shouldComponentUpdate() {
    return false;
  }
  render() {
    return (
      <RouteData>
        {({ about }) => (
          <div>
            <Head>
              <title>Steve Urmston | About</title>
            </Head>
            <AnimatedAbout contents={convert(about.contents)} />
          </div>
        )}
      </RouteData>
    )
  }
}

export default AboutContainer