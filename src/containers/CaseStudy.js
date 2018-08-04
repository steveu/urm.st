import React from 'react'
import { withRouteData, Link } from 'react-static'
import convert from 'htmr'
//

export default withRouteData(({ project }) => (
  <div>
    <Link to="/work/">{'<'} Back</Link>
    <br />
    {convert(project.contents)}
  </div>
))
