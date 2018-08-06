import React, { PureComponent } from 'react'
import { JSONLD, Generic } from 'react-structured-data'

class Schema extends PureComponent {
  render () {
    return (
      <JSONLD>
        <Generic
          type="person"
          jsonldtype="Person"
          schema={
            {
              "email": "steve@urm.st",
              "familyName": "Urmston",
              "givenName": "Steve",
              "jobTitle": "Full Stack Digital Product Designer"
            }
          }>
          <Generic
            type="address"
            jsonldtype="PostalAddress"
            schema={
              {
                "addressCountry": "GB",
                "addressLocality": "York",
                "postalCode": "YO10 4QE",
                "streetAddress": "The Coach House, Fulford Park",
                "name": "Steve Urmston"
              }
            }
          />
        </Generic>
      </JSONLD>
    )
  }
}

export default Schema