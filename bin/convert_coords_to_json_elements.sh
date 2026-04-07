#!/usr/bin/env bash

set -e -o pipefail

if [[ "$*" =~ \b(-h|--help)\b ]]
then
    echo "Usage: $0 <input_file> <output_file>"
    exit 0
fi

if [[ $# -ne 2 ]]
then
    echo "Usage: $0 <input_file> <output_file>"
    exit 1
fi

# we need to read from a file, instead of STDIN,
# because we prompt user for a description & waypoint-ness
# and if the `while` read loop is consuming STDIN, input for the prompts won't work
filename="$1"

# similarly, we need to write to a file instead of STDOUT,
# because prompts from `read` will not go the terminal if STDOUT is redirected
output_file="$2"
if [[ ! -r "$filename" ]]
then
    echo "$0: Error: Input file '$filename' is not readable."
    exit 1
fi

if ! touch "$output_file"
then
    echo "$0: Error: Output file '$output_file' is not writable."
    exit 1
fi

## Convert coordinates to JSON elements for use as a stop in routes/{my_route}.json
# $1: '[lat, long]' JSON array of coordinates
# $2: description of the stop
# $3: whether this stop is a waypoint only 'true' or 'false'
#
# a sigle JSON object with the above properties populated
function to_element {
    local coords="$1"
    local desc="$2"
    local waypoint_only="$3"

    cat <<JSON
  {
    "coordinates": [${coords}],
    "name": "$desc",
    "waypointOnly": $waypoint_only
  },
JSON

}

# read coordinates from file
coords_list=()
while read -r coords
do
    coords_list+=("$coords")
done < "$filename"

i=1
for coords in "${coords_list[@]}"
do
    read -p "desc for $i: " -r desc
    # assume that waypoint is visible & labeled, b/c that is what's most useful
    # when working on a new route or changes to existing route
    read -r -p "'$desc': \`wayPointOnly\`? [y/N]: " waypoint_only

    if [[ -n $waypoint_only && $waypoint_only =~ ^[yY] ]]
    then
        waypoint_only=true
    else
        waypoint_only=false
    fi

    to_element "$coords" "$desc" "$waypoint_only"
    i=$(( i + 1 ))
done
