import React from 'react'
import { RouteData, withRouteData } from 'react-static'
import Moment from 'react-moment'
import Icon from '../Icon'

export default withRouteData(({ resume }) => {

  const slugify = (text) => {
    return text.toString().toLowerCase()
      .replace(/\s+/g, '-')           // Replace spaces with -
      .replace(/[^\w\-]+/g, '')       // Remove all non-word chars
      .replace(/\-\-+/g, '-')         // Replace multiple - with single -
      .replace(/^-+/, '')             // Trim - from start of text
      .replace(/-+$/, '');            // Trim - from end of text
  }

  let skillTags = [];
  for (var i = 0; i < resume.skills.length; i++) {
    for (var t = 0; t < resume.skills[i].keywords.length; t++) {
      skillTags.push({
        name: resume.skills[i].keywords[t],
        category: slugify(resume.skills[i].name)
      });
    }
  }

  return (
    <div className="resume">
      <div className="grid-wrapper">

        <div className="resume__document">
          <div className="resume__section">
            <div className="resume__grid">
              <div className="resume__left">
                <h3>{resume.basics.name}</h3>
                <p>{resume.basics.label}</p>
              </div>
              <div className="resume__right">
                <p>{resume.basics.phone}</p>
                <p>{resume.basics.email}</p>
              </div>
            </div>
          </div>

          <div className="resume__section">
            <h4 className="resume__section-heading">Experience</h4>

            {resume.work.map(work => (
              <div className="resume__item">
                <div className="resume__grid">
                  <div className="resume__left">
                    <h5 className="resume__title">
                      <strong>{work.position}</strong>,&nbsp;
                      {work.website ? (
                        <a href={work.website}>{work.company}</a>
                      ) : (
                        <span>{work.company}</span>
                      )}
                    </h5>
                    {work.summary && (
                      <p>{work.summary}</p>
                    )}
                    {work.highlights && (
                      <ul>
                      {work.highlights.map(highlight => (
                        <li>{highlight}</li>
                      ))}
                      </ul>
                    )}
                  </div>
                  <div className="resume__right isDates">
                    <Moment format="MMM YYYY" date={work.startDate} />
                    &#8201;&#8211;&#8201;
                    {work.endDate ? (
                      <span>
                        <Moment format="MMM YYYY" date={work.endDate} />
                      </span>
                    ) : (
                      <span>Present</span>
                    )}
                  </div>
                </div>
              </div>
            ))}

          </div>

          <div className="resume__section">
            <h4 className="resume__section-heading">Education</h4>

            {resume.education.map(education => (
              <div className="resume__item">
                <div className="resume__grid">
                  <div className="resume__left">
                    <h5>
                      <strong>{education.studyType} {education.area}</strong>,&nbsp;
                      <span>{education.institution}</span>
                    </h5>
                    {education.highlights && (
                      <ul>
                      {education.highlights.map(highlight => (
                        <li>{highlight}</li>
                      ))}
                      </ul>
                    )}
                  </div>
                  <div className="resume__right isDates">
                    <Moment format="YYYY" date={education.startDate} />
                    &#8201;&#8211;&#8201;
                    {education.endDate ? (
                      <span>
                        <Moment format="YYYY" date={education.endDate} />
                      </span>
                    ) : (
                      <span>Present</span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="resume__section">
            <div className="resume__grid">
              <div className="resume__left">
                <h4 className="resume__section-heading">Skills</h4>
              </div>
              <div className="resume__right">
                <div className="resume__section-key">
                  {resume.skills.map(skill => (
                    <span className={slugify(skill.name)}>
                      <strong>{skill.name}</strong>
                      {skill.level === "Master" ? (
                        <Icon name="star" width="30" height="30" />
                      ) : (
                        null
                      )}
                    </span>
                  ))}
                </div>
              </div>
            </div>
            <div className="resume__skills">
              {skillTags.map(skill => (
                <span className={`resume__tag ${skill.category}`}>
                  {skill.name}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
})
