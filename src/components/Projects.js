import React, { PureComponent } from 'react'

// Components
import Project from './Project'

class Projects extends PureComponent {

  render () {
    let { projects, isFeatured } = this.props

    if (isFeatured) {
      projects = projects.filter(function(project) { return project.feature; })
    }

    return (
      <div>
        {projects.map((project, index) => (
          <Project
            key={index}
            project={project}
          />
        ))}
      </div>
    )
  }
}

export default Projects