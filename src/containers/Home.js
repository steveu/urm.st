import React from 'react'
import { withRouteData, Link } from 'react-static'
import convert from 'htmr'
//

export default withRouteData(({ home, projects }) => (
  <div>
    {convert(home.contents)}

    <ul>
      {projects.map(project => (
        <li key={project.slug}>
          <Link to={`/work/${project.slug}/`}>
            <img src={`projects/${project.slug}-hero.png`} width="400px" />
            {project.title}
          </Link>
        </li>
      ))}
    </ul>

  </div>
))