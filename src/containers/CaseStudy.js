import React from 'react'
import { withRouteData, Link } from 'react-static'
import convert from 'htmr'

import Icon from '../Icon'
//

export default withRouteData(({ project }) => (
  <div className="case_study">
    <div className="case_study__header">
      <h1><Icon name="bytemark" width="30" height="30" /></h1>
      
    </div>
    {convert(project.contents)}
    <Link className="case_study__back"to="/work">{'<'} Back</Link>
  </div>
))
