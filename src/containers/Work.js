import React from 'react'
import { withRouteData, Link } from 'react-static'
//
import Projects from '../components/Projects'

export default withRouteData(({ projects }) => (
  <Projects items={projects}></Projects>
))
