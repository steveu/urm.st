
import React from 'react'
import { withRouteData, Link } from 'react-static'
//

export default withRouteData(({ projects }) => (
  <div>
    {projects.map(project => (
      <section className={project.class} key={project.slug}>
        <div className="wrapper work">
          <figure>
            <Link to={`/work/${project.slug}/`}>
              <img src={`/projects/${project.slug}-hero.png`} width="400px" />
            </Link>
          </figure>
          <aside>
            <h2>{project.title}</h2>
            {project.description.map(paragraph => (
              <p>{paragraph}</p>
            ))}
          </aside>
        </div>
      </section>
    ))}
  </div>
))
