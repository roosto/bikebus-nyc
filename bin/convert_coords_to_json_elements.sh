#!/usr/bin/env bash

set -e -o pipefail

filename="$1"
output_file="$2"

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
    read -r -p "'$desc': \`wayPointOnly\`? [y/N]: " waypoint_only

    if [[ -n $waypoint_only && $waypoint_only =~ ^[yY] ]]
    then
        waypoint_only=true
    else
        waypoint_only=false
    fi

    to_element "$coords" "$desc" "$waypoint_only" >> "$output_file"
    i=$(( i + 1 ))
done
