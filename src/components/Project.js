import React, { PureComponent } from 'react'
import { Link } from 'react-static'
import convert from 'htmr'

import WindowChrome from './WindowChrome'

class Project extends PureComponent {

  renderFigure(project, image) {
    switch(project.type) {
      case 'video':
        return (
          <figure className="work__figure">
            <div className="fluid-video">
              <video loop controls preload="auto">
                <source src={project.video} />
              </video>
            </div>
          </figure>
        )
      case 'iframe':
        return (
          <figure className="work__figure">
            <div className="fluid-iframe">
              <iframe
                src={project.iframe}
                width="100%"
                frameBorder="0"
                marginWidth="0"
                marginHeight="0"
                scrolling="no"
                allowFullScreen
              ></iframe>
            </div>
          </figure>
        )
      default:
        return (
          <figure className="work__figure">
            <WindowChrome
              image={project.screenshot}
              imageAlt={project.title}
              frame_class={project.frame_class}
            />
          </figure>
        )
    }
  }

  render () {
    const { project } = this.props
    const { renderFigure } = this
    return (
      <section className={project.class} key={project.slug}>
        <div className="grid-wrapper">
          <div className="work">
            <h2 className="work__title">{project.title}</h2>
            {project.tags && (
              <p className="work__roles">
                {project.tags.join(' / ')}
              </p>
            )}
            {renderFigure(project)}
            {project.images && (
              <div className="work__images">
                {project.images.map((image, index) => (
                  <figure key={`work-${project.slug}-${index}`}>
                    <img src={image} />
                  </figure>
                ))}
              </div>
            )}

            <div className="work__details">
              <aside className="work__description">
                {convert(project.contents)}
              </aside>

              <div className="work__dates">
                {project.start && (
                  <p>
                    {!project.end && (
                      <span>Completed: </span>
                    )}
                    {project.start}
                    {project.end && (
                      <span>&thinsp;&#8211;&thinsp;{project.end}</span>
                    )}
                  </p>
                )}
                {project.link && (
                  <p>
                    <a href={project.link}>
                      {project.link}
                    </a>
                  </p>
                )}
                {project.case_study && (
                  <Link className="button" to={`/work/${project.slug}/`}>
                    Read case study
                  </Link>
                )}
                {project.download && (
                  <a className="button" href={project.download}>
                    Download the PDF
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>
    )
  }
}

export default Project