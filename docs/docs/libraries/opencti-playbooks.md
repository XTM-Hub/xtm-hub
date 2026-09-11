# OpenCTI Playbooks Library

A comprehensive library of playbooks is now available on XTM Hub,
providing seamless access to curated automation workflows.
Currently, the library focuses on playbooks that can be directly deployed to OpenCTI products and created by our Filigran Team.

![Playbooks Library](../assets/images/opencti-playbooks-lib.png)

## Overview

The OpenCTI playbooks library represents a significant advancement in threat intelligence automation accessibility.
The library features pre-built [playbooks](https://docs.opencti.io/latest/usage/playbook-automation/) that have been curated by the Filigran team,
ensuring high-quality, relevant automation content.

**Playbooks are an OpenCTI Enterprise Edition feature.** Running a playbook on your OpenCTI product requires an EE license, whether the playbook is deployed in one click from the Hub or downloaded and imported manually.

All users can browse the library on XTM Hub completely free of charge, with or without authentication, and read the full details of each playbook before deciding to deploy it.

Note that most playbooks require additional configuration once imported into OpenCTI, typically setting up connectors, labels, markings, or specific entities, before they can run. Each playbook's description on the Hub indicates its specific setup requirements.

## Getting Started

### Accessing the Library

The XTM Hub provides two distinct access methods to accommodate different user needs.
Authenticated access offers the complete feature set,
including the ability to browse and download playbooks,
deploy playbooks directly to OpenCTI Enterprise Edition products,
and access detailed playbook information and metadata.
For users who prefer to explore before committing,
public access provides read-only capabilities through the [Hub public portal](https://hub.filigran.io/),
where the complete library catalog can be viewed along with playbook descriptions and
details without requiring any connection or subscription.

## Working with Playbooks

### Playbook Exploration

The XTM Hub provides comprehensive information when you interact with any playbook tile in the library.
Each playbook includes detailed specifications and content descriptions to help you make informed decisions about integration.
Download options are readily available for users who prefer manual import processes,
while sharing capabilities allow you to generate shareable links that facilitate easy
collaboration with team members and external partners.

The playbooks library offers several filters to help you find the playbook that best suits your needs.
You can search by name and filter playbooks by use case to quickly locate relevant automation content.

### Manual Import to OpenCTI

Organizations that prefer traditional import methods can
easily download desired playbooks from the library and manually integrate them
into their OpenCTI products. This process involves downloading the playbook JSON file,
navigating to your OpenCTI product under `Data → Processing → Automation`, and using the standard Import functionality
to upload and configure the playbook according to your specific requirements.

### One-Click Deployment

The streamlined deployment process represents the most efficient method for integrating library playbooks
into your OpenCTI product.

Before utilizing this functionality, the following prerequisites must be met:

- Your OpenCTI product must be properly connected in the XTM Hub (see [OpenCTI connection documentation](../user/opencti-connection.md)).
- The target product must run an **Enterprise Edition** license.
- Your user account must possess the necessary CREATE and UPDATE permissions for playbooks within OpenCTI.

The deployment process is straightforward: select your desired playbook, click the `Deploy in OpenCTI` button,
choose your target product if multiple products are connected,
and wait a few seconds until you are redirected to your OpenCTI product where the playbook is created and ready to use.

![Top right buttons](../assets/images/one-click-deploy.png)

If none of your connected OpenCTI products is running an Enterprise Edition license,
the `Deploy in OpenCTI` button is displayed with an **[EE]** badge.
Clicking the badge opens a side panel that explains the Enterprise Edition feature and lets you contact our sales team to learn more.
In this case, you can still download the playbook JSON file and import it manually following the steps described above.

### Sharing and Collaboration

The XTM Hub facilitates seamless collaboration through its comprehensive sharing functionality.
Users can generate universal links for any playbook, enabling cross-organization sharing with partners,
clients, or team members without requiring recipients to maintain XTM Hub accounts.
This approach removes barriers to information sharing while maintaining the integrity and
accessibility of automation content across different organizational boundaries.

## Technical Requirements and Best Practices

Successful integration with the XTM Hub requires attention to several technical considerations.
Users deploying playbooks must maintain appropriate OpenCTI permissions,
including CREATE/UPDATE capability for playbooks.
Product connection involves enrolling OpenCTI products in the XTM Hub,
and one-click deployment additionally requires an OpenCTI Enterprise Edition license on the target product.
