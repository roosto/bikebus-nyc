#!/usr/bin/env bash

set -e -o pipefail

filename="$1"
output_file="$2"

function to_element {
    local coords="$1"
    local desc="$2"

    cat <<JSON
  {
    "coordinates": [${coords}],
    "name": "$desc",
    "waypointOnly": true
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
    to_element "$coords" "$desc" >> "$output_file"
    i=$(( i + 1 ))
done
