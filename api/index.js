import consola from "consola";
import { get, post } from "axios";
import { createClient } from "@supabase/supabase-js";
import { getOpenSeaFloorPrice } from "./_lib/opensea";

const supabaseUrl = process.env.SUPABASE_PUBLIC_URL;
const supabaseAnonKey = process.env.SUPABASE_SERVICE_KEY;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

module.exports = async (req, res) => {
  const { slug } = req.query;
  const url = `https://api.opensea.io/collection/${slug}`;
  consola.info("Write logs with Consola");

  await getOpenSeaFloorPrice(slug);

  let updatedCount = 0;

  // Get the ID so we can post back to Supabase.
  // Get the contract address to ping OpenSeae.
  const { data, error } = await supabase
    .from('projects')
    .select('id, contract_address')
    .eq('type', 'nft')

  const asyncRes = await Promise.all(data.map(async (post) => {
    const response = await get(`https://api.opensea.io/api/v1/asset/${post.contract_address}/1/?format=json`, { validateStatus: false });

    if (response.data.success !== false) {
      await supabase.from('projects').update({ stats: [response.data.collection.stats] }).match({ id: post.id }).then((res) => {
        updatedCount++
      })
    }
  }));


  res.setHeader('Content-Type', 'application/json');
  res.status(200).json({
    'updatedItems': updatedCount
  });


  // const asyncRes = await Promise.all(data.map(async (post) => {
  //     const response = await get(`https://api.opensea.io/api/v1/asset/${post.contract_address}/1/?format=json`, { validateStatus: false });

  //     if (response.data.success !== false) {
  //         await supabase.from('projects').update({ stats: [response.data.collection.stats] }).match({ id: post.id }).then((res) => {
  //             updatedCount++
  //         })
  //     }
  // }));
};
