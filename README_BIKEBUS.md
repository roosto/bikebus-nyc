# Brooklyn Bike Buses #

This repo was exported from this glitch project, which is not an active bike bus:
https://harmonious-three-industry.glitch.me/

## Process & Plan ##

Per Daniel, via email, our options for creating this new Brownsville Bike Bus tracker are:

> Glitch tracker
> - fully customizable in code
> - control your own infrastructure (there isn’t a repo off glitch but you can grab the code there)
> - manage routes by editing a JSON file
> - use a private beacon link to run the tracker
> - support for multiple buses, requires editing html
> 
> New tracker
> - no code
> - manage routes on a dashboard (temporarily, you still need to edit JSON. Happy to do this for you in the meantime.)
> - use a private beacon link or email log-in to run the tracker
> - support for multiple buses
> - invite collaborators to manage buses as admins or drivers
> - route status feature for weather alerts, detours, etc

At the least, we will need to create a `JSON` file with the coordinates for the new bike bus & its stops. To that end, I have grabbed the existing `JSON` file from the source of the [Bergen Bike Bus on glitch](https://glitch.com/~bergenbikebus).

## Beacon HowTo ##

1. set the `beacon_hash` value in the environment (`.env` file in Gitch)
2. the value set here creates an obfuscated URI of the form: `/beacon/{route_name}/{beacon_hash}`
3. load that URL, and your location will show up on the tracker

Other noteable beacon things:

* the beacon web page needs to be forgrounded on a non-locked device for it to keep transmitting location (at least for iOS devices)
    - look into `Guided Access` to facilitate this
* in-app instructions for error case of not sharing location cover 95%+ of cases
* lat/long will update on the beacon page as feedback that location is being transmitted & updated server-side
