*** Settings ***
Documentation     nuuka-v2-measurements-indoor-air-electricity - REST
Library           Collections
Library           DateTime
Library           PoTLib
Library           REST         ${API_URL}

*** Variables ***
${LOCAL_TZ}                  +02:00
${TEST_ENV}                  sandbox
${API_URL}                   https://api-${TEST_ENV}.oftrust.net
${API_PATH}                  /broker/v1/fetch-data-product
${CONNECTOR_URL}             http://localhost:8080
${CONNECTOR_PATH}            /translator/v1/fetch
${APP_TOKEN}                 %{POT_APP_ACCESS_TOKEN}
${CLIENT_SECRET}             %{POT_CLIENT_SECRET}
${PRODUCT_CODE}              %{POT_PRODUCT_CODE}

&{ID1}                       buildingId=2410  dataPointId=48268
&{ID2}                       buildingId=2410  dataPointId=48268
${STARTTIME}               	 2021-11-26T09:26:00+00:00
${ENDTIME}                 	 2021-11-27T09:26:00+00:00
@{IDS}                       
...                          ${ID1}
#...                          ${ID2}
${DATA_TYPE_1}               MeasureElectricityConsumptionKilowattHour
${DATA_TYPE_2}               MeasureHeatingElectricityConsumptionKilowattHour
${DATA_TYPE_3}               MeasureAirTemperatureCelsiusDegree
${DATA_TYPE_4}               MeasureAirCO2LevelPPM

@{DATA_TYPES_LIST}           
...                          ${DATA_TYPE_1}
...                          ${DATA_TYPE_2}
...                          ${DATA_TYPE_3}
...                          ${DATA_TYPE_4}

&{BROKER_BODY_PARAMETERS}    ids=@{IDS}
...                          dataTypes=@{DATA_TYPES_LIST}
...                          startTime=${STARTTIME}
...                          endTime=${ENDTIME}
&{BROKER_BODY}               productCode=${PRODUCT_CODE}
...                          parameters=${BROKER_BODY_PARAMETERS}

*** Keywords ***
Fetch Data Product
    [Arguments]     ${body}
    ${signature}    Calculate PoT Signature          ${body}    ${CLIENT_SECRET}
    Set Headers     {"x-pot-signature": "${signature}", "x-app-token": "${APP_TOKEN}"}
    POST            ${API_PATH}                      ${body}
    Output schema   response body

Get Body
    [Arguments]          &{kwargs}
    ${body}              Copy Dictionary      ${BROKER_BODY}    deepcopy=True
    ${now}               Get Current Date     time_zone=UTC     result_format=%Y-%m-%dT%H:%M:%S+00:00
    Set To Dictionary    ${body}              timestamp         ${now}
    Set To Dictionary    ${body}              &{kwargs}
    ${json_string}=      evaluate             json.dumps(${body})   json
    [Return]             ${body}

Fetch Data Product With Timestamp
    [Arguments]            ${increment}       ${time_zone}=UTC      ${result_format}=%Y-%m-%dT%H:%M:%S.%fZ
    ${timestamp}           Get Current Date
    ...                    time_zone=${time_zone}
    ...                    result_format=${result_format}
    ...                    increment=${increment}
    ${body}                Get Body                       timestamp=${timestamp}
    Fetch Data Product     ${body}

Fetch Data Product With Timestamp 200
    [Arguments]            ${increment}       ${time_zone}=UTC      ${result_format}=%Y-%m-%dT%H:%M:%S.%fZ
    Fetch Data Product With Timestamp         ${increment}    ${time_zone}    ${result_format}
    Integer                response status                200
    Array                  response body data items       minItems=2

Fetch Data Product With Timestamp 422
    [Arguments]            ${increment}
    Fetch Data Product With Timestamp         ${increment}
    Integer    response status                422
    Integer    response body error status     422
    String     response body error message    Request timestamp not within time frame.

*** Test Cases ***
fetch, 200
    ${body}               Get Body
    Fetch Data Product    ${body}
    Integer               response status                                         200
    String                response body @context                                  https://standards.oftrust.net/v2/Context/DataProductContext/Sensor/
    Object                response body data
    Array                 response body data sensors
    Object                response body data sensors 0 id
    Array                 response body data sensors 0 measurements
    String                response body data sensors 0 measurements 0 @type