import React from 'react'
import { Link } from 'react-static'

const Projects = (props) => (
  <div>
    {props.items.map(project => (
      <section className={project.class} key={project.slug}>
        <div className="grid-wrapper work">
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
            <Link className="button" to={`/work/${project.slug}/`}>
              Read case study
            </Link>
          </aside>
        </div>
      </section>
    ))}
  </div>
)

export default Projects